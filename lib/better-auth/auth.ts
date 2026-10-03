import { betterAuth } from "better-auth";
import { mongodbAdapter} from "better-auth/adapters/mongodb";
import { connectToDatabase} from "@/database/mongoose";
import { nextCookies} from "better-auth/next-js";
import type { Db } from "mongodb";

// Building the options as a standalone, typed function (rather than inline
// inside betterAuth(...)) lets `AuthOptions` capture the literal shape of
// `additionalFields` below. Without this, caching the instance in a
// pre-typed `let` variable widens it to the generic `Auth<BetterAuthOptions>`
// and every additional field silently disappears from `auth.api`'s types.
const createAuthOptions = (db: NonNullable<Awaited<ReturnType<typeof connectToDatabase>>['connection']['db']>) => ({
    // mongoose vendors its own nested copy of the `mongodb` driver, so its
    // `Db` type and the top-level `mongodb` package's `Db` type (which
    // better-auth's adapter expects) are structurally near-identical but
    // nominally distinct packages — hence the cast via `unknown` rather
    // than a type mismatch pointing at an actual bug.
    database: mongodbAdapter(db as unknown as Db),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
        enabled: true,
        disableSignUp: false,
        requireEmailVerification: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: false,
    },
    // Persist the onboarding answers collected on the sign-up form.
    // Without these, better-auth silently drops any extra fields sent
    // to signUpEmail — they never reach the database.
    user: {
        additionalFields: {
            country: { type: 'string', required: false } as const,
            investmentGoals: { type: 'string', required: false } as const,
            riskTolerance: { type: 'string', required: false } as const,
            preferredIndustry: { type: 'string', required: false } as const,
        },
    },
    plugins: [nextCookies()],
});

type AuthOptions = ReturnType<typeof createAuthOptions>;

let authInstance: ReturnType<typeof betterAuth<AuthOptions>> | null = null;

export const getAuth = async () => {
    if(authInstance) return authInstance;

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if(!db) throw new Error('MongoDB connection not found');

    authInstance = betterAuth(createAuthOptions(db));

    return authInstance;
}

export const auth = await getAuth();