import React from "react";
import MainLayout from "@/layouts/MainLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const RootRoute = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
