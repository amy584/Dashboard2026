import { OutsourceFlow } from "./OutsourceFlow";

/**
 * Outsource entry. The route param holds an id; `?type=suggestion` marks it as
 * a proactive suggestion (Fase 2), otherwise it's a nudge.
 */
export default async function OutsourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ nudgeId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { nudgeId } = await params;
  const { type } = await searchParams;
  return <OutsourceFlow id={nudgeId} source={type === "suggestion" ? "suggestion" : "nudge"} />;
}
