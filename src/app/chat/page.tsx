/**
 * Chat page - accessible to all authenticated users
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <ChatProvider>
      <div className="min-h-screen bg-slate-50 py-3 sm:py-6 lg:py-8">
        <div className="w-full px-2 sm:px-4 lg:px-8">
          <ChatInterface />
        </div>
      </div>
    </ChatProvider>
  );
}
