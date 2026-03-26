import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Mail, Check, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function Settings() {
  const account = trpc.emailAccount.get.useQuery();
  const saveAccount = trpc.emailAccount.save.useMutation({
    onSuccess: () => {
      toast.success("Email account saved and verified!");
      account.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const testConn = trpc.emailAccount.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.connected) toast.success("Connection successful!");
      else toast.error("Connection failed");
    },
    onError: (err) => toast.error(err.message),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("imap.one.com");
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState("send.one.com");
  const [smtpPort, setSmtpPort] = useState(465);

  useEffect(() => {
    if (account.data) {
      setEmail(account.data.emailAddress);
      setImapHost(account.data.imapHost);
      setImapPort(account.data.imapPort);
      setSmtpHost(account.data.smtpHost);
      setSmtpPort(account.data.smtpPort);
    }
  }, [account.data]);

  const handleSave = () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    saveAccount.mutate({
      emailAddress: email,
      password,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your email account and assistant preferences
        </p>
      </div>

      {/* Email Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Account
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your one.com email for AI-powered email management
              </CardDescription>
            </div>
            {account.data && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@yourdomain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={account.data ? "••••••••" : "Enter your email password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your password is stored securely and used only for IMAP/SMTP connections.
            </p>
          </div>

          {/* Advanced settings */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Server Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="imapHost" className="text-xs">IMAP Host</Label>
                <Input id="imapHost" value={imapHost} onChange={e => setImapHost(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imapPort" className="text-xs">IMAP Port</Label>
                <Input id="imapPort" type="number" value={imapPort} onChange={e => setImapPort(parseInt(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpHost" className="text-xs">SMTP Host</Label>
                <Input id="smtpHost" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPort" className="text-xs">SMTP Port</Label>
                <Input id="smtpPort" type="number" value={smtpPort} onChange={e => setSmtpPort(parseInt(e.target.value))} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={saveAccount.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {saveAccount.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {account.data ? "Update Account" : "Connect Account"}
            </Button>
            {account.data && (
              <Button
                variant="outline"
                onClick={() => testConn.mutate()}
                disabled={testConn.isPending}
              >
                {testConn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            About AI Assistant Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Inbox Intelligence</strong> — Reads your emails, classifies them (invoices, tasks, reminders), extracts action items, and drafts replies for your approval.</p>
            <p><strong className="text-foreground">Task Board</strong> — Automatically creates tasks from email analysis. Manage priorities, track progress, and stay organized.</p>
            <p><strong className="text-foreground">Festival Architect</strong> — Coming soon. Automated event planning and logistics.</p>
            <p><strong className="text-foreground">Workforce Concierge</strong> — Coming soon. WhatsApp-based employee communication and task extraction.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
