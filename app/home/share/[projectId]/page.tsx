
import type { Metadata } from "next";
import QRPage from "./QRPage";

export const metadata: Metadata = {
  title: "VoteSphere",
};

type SharePageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { projectId } = await params;

  return <QRPage projectId={projectId} />;
}
