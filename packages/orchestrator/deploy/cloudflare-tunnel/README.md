# Cloudflare Tunnel Deployment for Amanda

Expose Amanda's API securely over the internet using Cloudflare Tunnel with Cloudflare Access for authentication.

This approach gives you a public HTTPS URL without opening any ports on your machine.

## Prerequisites

- A Cloudflare account with a domain (free plan works)
- `cloudflared` CLI installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- Amanda orchestrator running locally on port 4100

### Install cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux (Debian/Ubuntu)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

## Step 1: Authenticate cloudflared

```bash
cloudflared tunnel login
```

This opens a browser window. Select the domain you want to use and authorize cloudflared.

## Step 2: Create a Tunnel

```bash
cloudflared tunnel create amanda
```

This outputs a tunnel ID (UUID). Save it — you'll need it for configuration.

## Step 3: Configure DNS

Create a CNAME record pointing to your tunnel:

```bash
cloudflared tunnel route dns amanda amanda.yourdomain.com
```

Replace `yourdomain.com` with your actual domain.

## Step 4: Update tunnel.yml

Copy the template and fill in your values:

```bash
cp tunnel.yml ~/.cloudflared/config.yml
```

Edit `~/.cloudflared/config.yml`:

- Replace `YOUR_TUNNEL_ID` with the UUID from Step 2
- Replace `amanda.yourdomain.com` with your chosen subdomain
- Verify the service port matches Amanda's port (default: 4100)

## Step 5: Set Up Cloudflare Access Policy

This is the recommended authentication layer for public exposure.

1. Go to **Cloudflare Zero Trust Dashboard** → https://one.dash.cloudflare.com
2. Navigate to **Access** → **Applications** → **Add an Application**
3. Choose **Self-hosted**
4. Configure:
   - **Application name**: Amanda Orchestrator
   - **Session duration**: 24 hours
   - **Application domain**: `amanda.yourdomain.com`
5. Add a policy:
   - **Policy name**: Allow authorized users
   - **Action**: Allow
   - **Include rule**: Choose one or more:
     - **Emails**: Add your email address
     - **Login Methods**: GitHub or Google OAuth
     - **IP Ranges**: Your home/office IP (optional additional restriction)
6. Save the application

Now anyone accessing `amanda.yourdomain.com` must authenticate through Cloudflare Access before reaching Amanda.

## Step 6: Run the Tunnel

```bash
cloudflared tunnel run amanda
```

To run as a system service:

```bash
# Linux
sudo cloudflared service install
sudo systemctl start cloudflared

# macOS
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

## Step 7: Test Access

```bash
# This should redirect to Cloudflare Access login
curl -I https://amanda.yourdomain.com

# After authenticating, test with your Amanda API key
curl -H "Authorization: Bearer YOUR_AMANDA_API_KEY" \
  https://amanda.yourdomain.com/api/status
```

## Security Notes

- **Two layers of auth**: Cloudflare Access (OAuth/SSO) + Amanda API key (Bearer token)
- **No open ports**: Cloudflare Tunnel creates outbound-only connections from your machine
- **DDoS protection**: Cloudflare's network sits in front of your tunnel
- **Audit logs**: Cloudflare Access logs all authentication attempts
- **API key is still required**: Even after passing Cloudflare Access, Amanda's own auth middleware validates the Bearer token
- **Never expose Amanda without at least one auth layer** — do not disable both Cloudflare Access and Amanda's API key auth

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Tunnel won't start | Check `~/.cloudflared/config.yml` syntax and tunnel ID |
| 502 Bad Gateway | Amanda isn't running on the configured port |
| Access denied after auth | Verify your Amanda API key is correct |
| DNS not resolving | Wait 1-2 minutes for DNS propagation, or check CNAME record |
