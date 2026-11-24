import AccessKeyPage from "./AccessKeyPage";

type AccessKeyRouteProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

export default async function AccessKeyRoute({
  searchParams,
}: AccessKeyRouteProps) {
  const { projectId } = await searchParams;
  return <AccessKeyPage projectId={projectId ?? ""} />;
}
