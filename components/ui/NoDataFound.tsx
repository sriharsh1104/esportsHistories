import React from "react";
import { ClassicEmptyState } from "./ClassicEmptyState";

type NoDataFoundProps = {
  title?: string;
  description?: string;
};

/** Thin wrapper over `ClassicEmptyState` for existing imports. */
export function NoDataFound({
  title = "No data found",
  description = "Nothing to show right now. Try again later or change filters.",
}: NoDataFoundProps) {
  return (
    <ClassicEmptyState
      variant="empty"
      title={title}
      message={description}
      icon="inbox"
    />
  );
}
