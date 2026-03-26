import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Users, Phone, Briefcase, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Employees() {
  const { data: employees, isLoading, refetch } = trpc.employee.list.useQuery();
  const createMut = trpc.employee.create.useMutation({
    onSuccess: () => { toast.success("Employee added"); refetch(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.employee.delete.useMutation({
    onSuccess: () => { toast.success("Employee removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");

  const resetForm = () => {
    setPhone(""); setName(""); setRole(""); setDepartment(""); setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) { toast.error("Phone and name are required"); return; }
    createMut.mutate({ phone, name, role: role || undefined, department: department || undefined });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage your employee directory for WhatsApp integration</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <Card className="bg-card border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-500">Add New Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (with country code)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role (optional)</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="role"
                    placeholder="e.g. Stage Manager"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department (optional)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="department"
                    placeholder="e.g. Operations"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
              <div className="col-span-full flex gap-2">
                <Button
                  type="submit"
                  disabled={createMut.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {createMut.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  Save Employee
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      {(!employees || employees.length === 0) ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No employees added yet. Add employees so the system can identify who is messaging on WhatsApp.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp: any) => (
            <Card key={emp.id} className="bg-card border-border hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{emp.name}</p>
                    <p className="text-sm text-muted-foreground">{emp.phone}</p>
                    {emp.role && <p className="text-xs text-amber-400 mt-1">{emp.role}</p>}
                    {emp.department && <p className="text-xs text-muted-foreground">{emp.department}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMut.mutate({ id: emp.id })}
                    disabled={deleteMut.isPending}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
