import type { NextConfig } from "next";
import { networkInterfaces } from "os";

/** Hosts allowed to hit the dev server from other devices (e.g. phone on same Wi‑Fi). */
function lanDevHosts(): string[] {
  const nets = networkInterfaces();
  if (!nets) return [];
  const hosts: string[] = [];
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      const family = net.family;
      const isV4 = family === "IPv4";
      if (isV4 && !net.internal) hosts.push(net.address);
    }
  }
  return hosts;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.kinderx.app", ...lanDevHosts()],
};

export default nextConfig;
