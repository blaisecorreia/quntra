import { inngest } from "@/lib/inngest/client";
import { gemini } from "@inngest/ai/models";
import { PERSONALIZED_WELCOME_EMAIL_PROMPT, PRICE_ALERT_CONTEXT_PROMPT } from "@/lib/inngest/prompts";
import { sendWelcomeEmail, sendPriceAlertEmail } from "@/lib/nodemailer";
import { connectToDatabase } from "@/database/mongoose";
import { Alert } from "@/database/models/alert.model";
import { getStockQuote, getCompanyNews } from "@/lib/actions/finnhub.actions";
import { getUserById } from "@/lib/actions/user.actions";

const FALLBACK_ALERT_CONTEXT = "No recent news is available for this move — worth checking the latest coverage for context.";

export const sendSignUpEmail = inngest.createFunction(
    {
        id: 'sign-up-email',
        triggers: [{ event: 'app/user.created' }]
    },
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) || 'Thanks for joining Quntra. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const checkPriceAlerts = inngest.createFunction(
    {
        id: 'check-price-alerts',
        triggers: [{ cron: '* * * * *' }]
    },
    async ({ step }) => {
        await connectToDatabase();

        const alerts = await step.run('fetch-active-alerts', async () => {
            return await Alert.find({ isActive: true }).lean();
        });

        if (!alerts || alerts.length === 0) {
            return { success: true, checked: 0 };
        }

        const symbols = [...new Set(alerts.map((a) => a.symbol))];

        const quotes = await step.run('fetch-quotes', async () => {
            const quoteMap: Record<string, number> = {};
            for (const symbol of symbols) {
                const res = await getStockQuote(symbol);
                if (res.success && res.data?.c) {
                    quoteMap[symbol] = res.data.c;
                }
            }
            return quoteMap;
        });

        let triggered = 0;
        for (const alert of alerts) {
            const currentPrice = quotes[alert.symbol];
            if (currentPrice === undefined) continue;

            const isHit = alert.alertType === 'upper'
                ? currentPrice >= alert.threshold
                : currentPrice <= alert.threshold;

            if (isHit) {
                // News fetch and the AI call are their own top-level steps
                // (Inngest doesn't allow step.ai.infer nested inside
                // step.run) and only run when there's real news to reason
                // about — skipping the AI call otherwise keeps this free
                // of cost on alerts with nothing to explain.
                const newsRes = await step.run(`fetch-news-${alert._id}`, async () => {
                    return await getCompanyNews(alert.symbol);
                });
                const articles = (newsRes.success ? newsRes.data || [] : []).slice(0, 3);

                let aiContext = FALLBACK_ALERT_CONTEXT;
                if (articles.length > 0) {
                    const newsContext = articles.map((a) => `- ${a.headline}: ${a.summary}`).join('\n');
                    const direction = alert.alertType === 'upper' ? 'above' : 'below';
                    const prompt = PRICE_ALERT_CONTEXT_PROMPT
                        .replace('{{symbol}}', alert.symbol)
                        .replace('{{company}}', alert.company)
                        .replace('{{direction}}', direction)
                        .replace(/{{targetPrice}}/g, `$${alert.threshold.toFixed(2)}`)
                        .replace('{{currentPrice}}', `$${currentPrice.toFixed(2)}`)
                        .replace('{{newsContext}}', newsContext);

                    const aiResponse = await step.ai.infer(`alert-context-${alert._id}`, {
                        model: gemini({ model: 'gemini-2.5-flash-lite' }),
                        body: {
                            contents: [
                                {
                                    role: 'user',
                                    parts: [{ text: prompt }]
                                }
                            ]
                        }
                    });

                    const part = aiResponse.candidates?.[0]?.content?.parts?.[0];
                    aiContext = (part && 'text' in part ? part.text : null) || FALLBACK_ALERT_CONTEXT;
                }

                await step.run(`notify-${alert._id}`, async () => {
                    const userRes = await getUserById(alert.userId);
                    if (userRes.success && userRes.data?.email) {
                        await sendPriceAlertEmail({
                            email: userRes.data.email,
                            symbol: alert.symbol,
                            company: alert.company,
                            currentPrice,
                            targetPrice: alert.threshold,
                            direction: alert.alertType,
                            aiContext,
                        });
                    }

                    await Alert.updateOne(
                        { _id: alert._id },
                        {
                            triggered: true,
                            triggeredAt: new Date(),
                            isActive: false,
                            lastCheckedPrice: currentPrice,
                        }
                    );

                    triggered++;
                });
            }
        }

        return {
            success: true,
            checked: alerts.length,
            triggered,
        }
    }
)