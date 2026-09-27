import { inngest } from "@/lib/inngest/client";
import { gemini } from "@inngest/ai/models";
import { PERSONALIZED_WELCOME_EMAIL_PROMPT } from "@/lib/inngest/prompts";
import { sendWelcomeEmail, sendPriceAlertEmail } from "@/lib/nodemailer";
import { connectToDatabase } from "@/database/mongoose";
import { Alert } from "@/database/models/alert.model";
import { getStockQuote } from "@/lib/actions/finnhub.actions";
import { getUserById } from "@/lib/actions/user.actions";

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