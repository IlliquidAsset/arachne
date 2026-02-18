# Tailscale Deployment for Amanda

Access Amanda securely from any of your devices using Tailscale's zero-config VPN mesh network.

This is the simplest deployment option — no DNS, no certificates, no port forwarding.

## Prerequisites

- Tailscale installed and logged in: https://tailscale.com/download
- Amanda orchestrator running locally on port 4100

### Install Tailscale

```bash
# macOS
brew install tailscale

# Linux (Debian/Ubuntu)
curl -fsSL https://tailscale.com/install.sh | sh
```

## Step 1: Connect to Tailscale

```bash
sudo tailscale up
```

Your machine gets a stable IP on your tailnet (e.g., `100.x.y.z`).

Check your Tailscale IP:

```bash
tailscale ip -4
```

## Step 2: Access Amanda from Any Tailscale Device

From any other device on your tailnet:

```bash
curl -H "Authorization: Bearer YOUR_AMANDA_API_KEY" \
  http://100.x.y.z:4100/api/status
```

You can also use the MagicDNS hostname:

```bash
curl -H "Authorization: Bearer YOUR_AMANDA_API_KEY" \
  http://your-machine-name:4100/api/status
```

## Step 3: Expose via Tailscale Funnel (Optional — Public Access)

Tailscale Funnel lets you expose Amanda to the public internet through Tailscale's infrastructure:

```bash
# Enable HTTPS funnel on port 4100
tailscale funnel 4100
```

This gives you a public URL like `https://your-machine-name.tail1234.ts.net/`.

To run in the background:

```bash
tailscale funnel --bg 4100
```

To stop:

```bash
tailscale funnel --bg off
```

## Security Notes

- **Tailnet access is private by default**: Only devices on your Tailscale network can reach Amanda
- **Funnel is optional**: Only enable it if you need public internet access
- **WireGuard encryption**: All traffic between Tailscale devices is end-to-end encrypted
- **Amanda API key still required**: Even on your tailnet, Bearer token auth protects the API
- **ACLs**: Use Tailscale ACLs to restrict which devices can reach the Amanda host
- **No certificates needed**: Tailscale handles TLS for Funnel automatically
- **MagicDNS**: Tailscale provides automatic DNS names for all your devices

## Tailscale vs Cloudflare Tunnel

| Feature | Tailscale | Cloudflare Tunnel |
|---------|-----------|-------------------|
| Setup complexity | Minimal | Moderate |
| Public access | Optional (Funnel) | Yes |
| Auth layer | Tailnet membership | Cloudflare Access (OAuth) |
| DDoS protection | No | Yes |
| Custom domain | No (uses ts.net) | Yes |
| Best for | Personal / small team | Public-facing / enterprise |
