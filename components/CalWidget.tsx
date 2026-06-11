"use client";

import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

const CAL_LINK = "dragana-dokmanovic/konsultacije";

export default function CalWidget() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: "konsultacije" });
      cal("ui", {
        theme: "dark",
        styles: { branding: { brandColor: "#d4a843" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  return (
    <Cal
      namespace="konsultacije"
      calLink={CAL_LINK}
      style={{ width: "100%", height: "100%", overflow: "scroll" }}
      config={{ layout: "month_view", theme: "dark" }}
    />
  );
}
