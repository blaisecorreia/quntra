import Header from "@/components/Header";
import {auth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {ChatWidget} from "@/components/Chat/ChatWidget";
import {getChatHistory} from "@/lib/actions/chat.actions";

const Layout = async ({ children }: { children : React.ReactNode }) => {
    const session = await auth.api.getSession({ headers: await headers() });

    if(!session?.user) redirect('/sign-in');

    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    }

    const chatHistoryRes = await getChatHistory();
    const initialMessages = chatHistoryRes.success ? chatHistoryRes.data || [] : [];

    return (
        <main className="min-h-screen text-gray-400">
            <Header user={user} />

            <div className="container py-10">
                {children}
            </div>

            <ChatWidget initialMessages={initialMessages} />
        </main>
    )
}
export default Layout