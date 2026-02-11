import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

const DeleteAccountPage = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg shadow-lg border-border/60">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Delete Your Playoga Account</h1>
          <p className="text-sm text-muted-foreground">
            If you would like to request deletion of your Playoga account and associated data, please submit the form below.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-foreground font-medium">Your deletion request has been recorded.</p>
              <p className="text-sm text-muted-foreground">Our team will contact you shortly.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                  <Input placeholder="Enter your full name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Registered Email Address</label>
                  <Input type="email" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Reason for Deletion</label>
                  <Textarea placeholder="Tell us why you'd like to delete your account (optional)" rows={3} />
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setSubmitted(true)}
              >
                Request Account Deletion
              </Button>
            </>
          )}

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              Important Information
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Account and associated data will be permanently deleted within 7 business days.</li>
              <li>Account information (name, email) will be removed.</li>
              <li>Subscription and profile data will be deleted.</li>
              <li>Certain transaction records may be retained for legal purposes.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteAccountPage;
