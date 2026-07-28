import { Inter} from "next/font/google";
import "./globals.css";
import Header from "../components/header"
import { ConvexClientProvider } from "../components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({subsets:["latin"]});

export const metadata = {
  title: "Splitr",
  description: "A smarter way to manage",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.className}`}
    >
      <head>
        <link rel="icon" href="/logos/logo-s.png" sizes="any"/>
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
        <ConvexClientProvider>
        <Header/>
        <main className="min-h-screen">{children}</main>
        </ConvexClientProvider>
        </ClerkProvider>
        </body>
    </html>
  );
}
