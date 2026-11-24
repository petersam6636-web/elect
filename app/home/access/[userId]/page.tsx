import AccessProjectPage from "./AccessProjectPage";

type AccessRouteProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function AccessRoute({ params }: AccessRouteProps) {
  const { userId } = await params;
  return <AccessProjectPage userId={userId} />;
}
