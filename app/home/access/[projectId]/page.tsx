import AccessProjectPage from "./AccessProjectPage";

type AccessRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function AccessRoute({ params }: AccessRouteProps) {
  const { projectId } = await params;
  return <AccessProjectPage projectId={projectId} />;
}
