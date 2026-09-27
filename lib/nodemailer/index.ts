import nodemailer from 'nodemailer';
import {WELCOME_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE} from "@/lib/nodemailer/templates";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

// The templates' CTA buttons and footer links point back to this app via
// {{dashboardUrl}} — BETTER_AUTH_URL is already the canonical base URL for
// this deployment (localhost in dev, the real domain in production).
const dashboardUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', intro)
        .replace(/{{dashboardUrl}}/g, dashboardUrl);

    const mailOptions = {
        from: `"Quntra" <quntra@gmail.com>`,
        to: email,
        subject: `Welcome to Quntra - your stock market toolkit is ready!`,
        text: 'Thanks for joining Quntra',
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

export const sendPriceAlertEmail = async ({
    email,
    symbol,
    company,
    currentPrice,
    targetPrice,
    direction,
}: {
    email: string;
    symbol: string;
    company: string;
    currentPrice: number;
    targetPrice: number;
    direction: 'upper' | 'lower';
}) => {
    const isUpper = direction === 'upper';
    const template = isUpper ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

    const htmlTemplate = template
        .replace(/{{symbol}}/g, symbol)
        .replace(/{{company}}/g, company)
        .replace(/{{currentPrice}}/g, currentPrice.toFixed(2))
        .replace(/{{targetPrice}}/g, targetPrice.toFixed(2))
        .replace(/{{timestamp}}/g, new Date().toLocaleString())
        .replace(/{{dashboardUrl}}/g, dashboardUrl);

    const subject = `Price Alert: ${symbol} ${isUpper ? 'exceeded' : 'dropped below'} $${targetPrice.toFixed(2)}`;

    const mailOptions = {
        from: `"Quntra" <quntra@gmail.com>`,
        to: email,
        subject,
        text: `${symbol} alert triggered. Current price: $${currentPrice.toFixed(2)}`,
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

