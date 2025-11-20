import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier, type InsertSupplier } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, User } from "lucide-react";

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      personType: "juridica",
      razaoSocial: "",
      cnpjCpf: "",
      nomeFantasia: "",
      email: "",
      telefone: "",
      celular: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      website: "",
      instagram: "",
      facebook: "",
      linkedin: "",
      observacoes: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const res = await apiRequest("POST", "/api/suppliers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Fornecedor criado com sucesso!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar fornecedor", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSupplier> }) => {
      const res = await apiRequest("PATCH", `/api/suppliers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Fornecedor atualizado com sucesso!" });
      setIsDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar fornecedor", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/suppliers/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Fornecedor excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir fornecedor", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertSupplier) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenDialog = () => {
    setEditingSupplier(null);
    form.reset();
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <Button disabled={!canCreate} onClick={handleOpenDialog} data-testid="button-add-supplier">
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <CardDescription>Todos os fornecedores cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
            </div>
          ) : suppliers.length === 0 ? (
            <p className="text-muted-foreground" data-testid="text-empty-suppliers">Nenhum fornecedor cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Razão Social / Nome</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                    <TableCell data-testid={`cell-type-${supplier.id}`}>
                      {supplier.personType === "juridica" ? (
                        <Building2 className="h-4 w-4" data-testid={`icon-juridica-${supplier.id}`} />
                      ) : (
                        <User className="h-4 w-4" data-testid={`icon-fisica-${supplier.id}`} />
                      )}
                    </TableCell>
                    <TableCell data-testid={`cell-cnpj-cpf-${supplier.id}`}>{supplier.cnpjCpf}</TableCell>
                    <TableCell className="font-medium" data-testid={`cell-razao-social-${supplier.id}`}>{supplier.razaoSocial}</TableCell>
                    <TableCell data-testid={`cell-nome-fantasia-${supplier.id}`}>{supplier.nomeFantasia}</TableCell>
                    <TableCell data-testid={`cell-email-${supplier.id}`}>{supplier.email}</TableCell>
                    <TableCell data-testid={`cell-telefone-${supplier.id}`}>{supplier.telefone || supplier.celular}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!canUpdate}
                        onClick={() => handleEdit(supplier)}
                        data-testid={`button-edit-supplier-${supplier.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!canDelete}
                        onClick={() => handleDelete(supplier.id)}
                        data-testid={`button-delete-supplier-${supplier.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor abaixo
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="personType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Pessoa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-person-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fisica">Pessoa Física</SelectItem>
                        <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cnpjCpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ/CPF</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-cnpj-cpf" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="razaoSocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social / Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-razao-social" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nomeFantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-nome-fantasia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-telefone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-celular" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-cep" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-endereco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-numero" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-complemento" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-bairro" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-cidade" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (UF)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} maxLength={2} data-testid="input-estado" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || "Brasil"} data-testid="input-pais" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="@usuario" data-testid="input-instagram" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-facebook" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-linkedin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={3} data-testid="textarea-observacoes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
