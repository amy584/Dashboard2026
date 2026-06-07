import { OutsourceFlow } from "./OutsourceFlow";

export default async function OutsourcePage({
  params,
}: {
  params: Promise<{ nudgeId: string }>;
}) {
  const { nudgeId } = await params;
  return <OutsourceFlow nudgeId={nudgeId} />;
}
