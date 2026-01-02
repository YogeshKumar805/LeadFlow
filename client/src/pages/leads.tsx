import { useState } from "react";
import { useLeads, useCreateLead, useUpdateLead, useLeadNotes, useCreateNote } from "@/hooks/use-leads";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, Phone, Calendar, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Lead, InsertLead } from "@shared/schema";

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  FOLLOW_UP: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  CONVERTED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  
  const { user } = useAuth();
  const { data: leads, isLoading } = useLeads({ 
    search, 
    status: statusFilter === "ALL" ? undefined : statusFilter 
  });
  const { data: executives } = useUsers("EXECUTIVE");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Leads</h1>
          <p className="text-muted-foreground">Manage and track your potential customers</p>
        </div>
        
        <CreateLeadDialog />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Follow-up</TableHead>
              {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                <TableHead>Assigned To</TableHead>
              )}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading leads...</TableCell>
              </TableRow>
            ) : leads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No leads found.</TableCell>
              </TableRow>
            ) : (
              leads?.map((lead) => (
                <TableRow key={lead.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.serviceType}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" /> {lead.mobile}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {lead.city}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${statusColors[lead.status]} border-none`}>
                      {lead.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.followUpAt ? (
                      <span className={new Date(lead.followUpAt) < new Date() && lead.status !== "CONVERTED" && lead.status !== "CLOSED" ? "text-red-500 font-medium" : ""}>
                        {format(new Date(lead.followUpAt), "MMM d, h:mm a")}
                      </span>
                    ) : "-"}
                  </TableCell>
                  {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                    <TableCell>
                      {executives?.find(e => e.id === lead.assignedTo)?.name || "Unassigned"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedLeadId(lead.id)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLeadId && (
        <LeadDetailDialog 
          leadId={selectedLeadId} 
          open={!!selectedLeadId} 
          onOpenChange={(open) => !open && setSelectedLeadId(null)} 
        />
      )}
    </div>
  );
}

function CreateLeadDialog() {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createLead, isPending } = useCreateLead();
  const { data: executives } = useUsers("EXECUTIVE");
  const { user } = useAuth();
  
  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      name: "",
      mobile: "",
      serviceType: "",
      city: "",
      source: "",
      status: "NEW",
    }
  });

  async function onSubmit(data: InsertLead) {
    try {
      await createLead(data);
      setOpen(false);
      form.reset();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl><Input placeholder="+1 234..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Interest</FormLabel>
                  <FormControl><Input placeholder="e.g. Web Development" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="New York" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select executive" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {executives?.map(ex => (
                          <SelectItem key={ex.id} value={ex.id.toString()}>{ex.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating..." : "Create Lead"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailDialog({ leadId, open, onOpenChange }: { leadId: number, open: boolean, onOpenChange: (open: boolean) => void }) {
  // We need to fetch the specific lead data inside the dialog components, 
  // but to keep it simple we'll fetch in this component.
  // In a larger app, we might pass data or use context.
  
  // NOTE: We assume `leads` data from parent is fresh enough or we fetch single lead
  const { data: lead } = useLeads({ status: undefined }); // Re-using cache mostly
  const currentLead = lead?.find(l => l.id === leadId);

  if (!currentLead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-display">{currentLead.name}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3" /> {currentLead.city} • <Phone className="w-3 h-3" /> {currentLead.mobile}
              </p>
            </div>
            <Badge className={statusColors[currentLead.status]}>{currentLead.status}</Badge>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <StatusUpdateCard lead={currentLead} />
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Lead Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-medium">{currentLead.serviceType}</span>
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-medium">{currentLead.source}</span>
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(currentLead.createdAt!), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-full flex flex-col">
              <NotesSection leadId={leadId} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusUpdateCard({ lead }: { lead: Lead }) {
  const { mutate: updateLead, isPending } = useUpdateLead();
  const [date, setDate] = useState<string>(lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 16) : "");
  const [status, setStatus] = useState(lead.status);

  const handleUpdate = () => {
    const updateData: Partial<InsertLead> = { status };
    if (status === "FOLLOW_UP") {
      if (!date) return; // Validation handled by UI state ideally
      updateData.followUpAt = new Date(date);
    }
    updateLead({ id: lead.id, data: updateData });
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold">Update Status</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "FOLLOW_UP" && (
            <div className="animate-in slide-in-from-top-2">
              <label className="text-xs font-medium mb-1.5 block text-primary">Next Follow-up Date *</label>
              <Input 
                type="datetime-local" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="border-primary/20 focus-visible:ring-primary/20"
              />
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handleUpdate} 
            disabled={isPending || (status === "FOLLOW_UP" && !date)}
          >
            {isPending ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotesSection({ leadId }: { leadId: number }) {
  const { data: notes, isLoading } = useLeadNotes(leadId);
  const { mutate: addNote, isPending } = useCreateNote();
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addNote({ leadId, noteText: text }, {
      onSuccess: () => setText("")
    });
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border shadow-sm">
      <div className="p-4 border-b bg-muted/50 font-medium">Notes & Activity</div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center">Loading notes...</p>
        ) : notes?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
        ) : (
          notes?.map((note) => (
            <div key={note.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-xs text-primary">{note.authorName[0]}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium">{note.authorName}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(note.createdAt!), "MMM d, h:mm a")}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{note.noteText}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-muted/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            placeholder="Type a note..." 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            className="bg-background"
          />
          <Button type="submit" size="icon" disabled={isPending || !text.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
