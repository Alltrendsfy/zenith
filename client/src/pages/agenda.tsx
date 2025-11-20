import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getActivitiesQueryKey, invalidateActivityQueries } from "@/lib/activityUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Activity } from "@shared/schema";
import { ActivityFormDialog } from "@/components/activity-form-dialog";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "day" | "week" | "month";

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scopeFilter, setScopeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { toast } = useToast();

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case "day":
        return {
          startDate: format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss"),
          endDate: format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss"),
        };
      case "week":
        return {
          startDate: format(startOfWeek(selectedDate, { locale: ptBR }), "yyyy-MM-dd'T'HH:mm:ss"),
          endDate: format(endOfWeek(selectedDate, { locale: ptBR }), "yyyy-MM-dd'T'HH:mm:ss"),
        };
      case "month":
        return {
          startDate: format(startOfMonth(selectedDate), "yyyy-MM-dd'T'HH:mm:ss"),
          endDate: format(endOfMonth(selectedDate), "yyyy-MM-dd'T'HH:mm:ss"),
        };
    }
  };

  const { startDate, endDate} = getDateRange();

  // Fetch activities using centralized query key factory
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: getActivitiesQueryKey(startDate, endDate, scopeFilter, statusFilter),
  });

  // Toggle activity status
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/activities/${id}/toggle`, {});
    },
    onSuccess: () => {
      invalidateActivityQueries(queryClient);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar status da atividade",
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "text-red-500";
      case "media": return "text-yellow-500";
      case "baixa": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getScopeColor = (scope: string) => {
    return scope === "empresarial" ? "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" : "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  const renderActivityCard = (activity: Activity) => (
    <Card 
      key={activity.id} 
      className="mb-3 hover-elevate cursor-pointer" 
      onClick={() => {
        setSelectedActivity(activity);
        setIsDialogOpen(true);
      }}
      data-testid={`card-activity-${activity.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={activity.status === "concluida"}
            onCheckedChange={() => toggleMutation.mutate(activity.id)}
            onClick={(e) => e.stopPropagation()}
            data-testid={`toggle-activity-${activity.id}`}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className={`font-medium ${activity.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                {activity.title}
              </h3>
              <Badge variant="outline" className={getScopeColor(activity.scope)}>
                {activity.scope === "empresarial" ? "Empresarial" : "Pessoal"}
              </Badge>
            </div>
            
            {activity.description && (
              <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(activity.startAt), "HH:mm", { locale: ptBR })}
                {activity.endAt && ` - ${format(new Date(activity.endAt), "HH:mm", { locale: ptBR })}`}
              </div>
              
              <div className={`flex items-center gap-1 ${getPriorityColor(activity.priority)}`}>
                <AlertCircle className="w-3 h-3" />
                Prioridade {activity.priority}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDayView = () => {
    const dayActivities = activities.filter(a => 
      isSameDay(new Date(a.startAt), selectedDate)
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              data-testid="button-previous-day"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              data-testid="button-today"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              data-testid="button-next-day"
            >
              Próximo
            </Button>
          </div>
        </div>

        {dayActivities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma atividade para este dia
            </CardContent>
          </Card>
        ) : (
          dayActivities.map(renderActivityCard)
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { locale: ptBR });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(endOfWeek(selectedDate, { locale: ptBR }), "d 'de' MMMM", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              data-testid="button-previous-week"
            >
              Semana Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              data-testid="button-today"
            >
              Esta Semana
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              data-testid="button-next-week"
            >
              Próxima Semana
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((day) => {
            const dayActivities = activities.filter(a => isSameDay(new Date(a.startAt), day));
            const isToday = isSameDay(day, new Date());

            return (
              <Card key={day.toISOString()} className={isToday ? "border-primary" : ""}>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {format(day, "EEE d", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {dayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`text-xs p-2 rounded-md ${getScopeColor(activity.scope)} ${
                        activity.status === "concluida" ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {activity.status === "concluida" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Circle className="w-3 h-3" />
                        )}
                        <span className="font-medium truncate">{activity.title}</span>
                      </div>
                      <div className="text-xs opacity-75">
                        {format(parseISO(activity.startAt), "HH:mm")}
                      </div>
                    </div>
                  ))}
                  {dayActivities.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Sem atividades
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDateOfGrid = startOfWeek(monthStart, { locale: ptBR });
    const endDateOfGrid = endOfWeek(monthEnd, { locale: ptBR });
    
    const days = [];
    let currentDate = startDateOfGrid;
    while (currentDate <= endDateOfGrid) {
      days.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -30))}
              data-testid="button-previous-month"
            >
              Mês Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              data-testid="button-today"
            >
              Este Mês
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 30))}
              data-testid="button-next-month"
            >
              Próximo Mês
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2">
              {day}
            </div>
          ))}
          
          {days.map((day) => {
            const dayActivities = activities.filter(a => isSameDay(new Date(a.startAt), day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();

            return (
              <Card
                key={day.toISOString()}
                className={`min-h-24 ${isToday ? "border-primary" : ""} ${
                  !isCurrentMonth ? "opacity-50" : ""
                }`}
              >
                <CardContent className="p-2">
                  <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                  <div className="space-y-1">
                    {dayActivities.slice(0, 2).map((activity) => (
                      <div
                        key={activity.id}
                        className={`text-xs p-1 rounded truncate ${getScopeColor(activity.scope)}`}
                      >
                        {activity.title}
                      </div>
                    ))}
                    {dayActivities.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayActivities.length - 2} mais
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agenda</h1>
          <p className="text-muted-foreground">Gerencie suas atividades e compromissos</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedActivity(null);
            setIsDialogOpen(true);
          }} 
          data-testid="button-add-activity"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <ActivityFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedActivity(null);
          }
        }}
        activity={selectedActivity}
      />

      <div className="flex gap-4 mb-6">
        <Button
          variant={scopeFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setScopeFilter(null)}
          data-testid="filter-all-scope"
        >
          Todas
        </Button>
        <Button
          variant={scopeFilter === "empresarial" ? "default" : "outline"}
          size="sm"
          onClick={() => setScopeFilter("empresarial")}
          data-testid="filter-empresarial"
        >
          Empresariais
        </Button>
        <Button
          variant={scopeFilter === "pessoal" ? "default" : "outline"}
          size="sm"
          onClick={() => setScopeFilter("pessoal")}
          data-testid="filter-pessoal"
        >
          Pessoais
        </Button>
        
        <div className="border-l mx-2" />
        
        <Button
          variant={statusFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(null)}
          data-testid="filter-all-status"
        >
          Todas
        </Button>
        <Button
          variant={statusFilter === "pendente" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("pendente")}
          data-testid="filter-pendente"
        >
          Pendentes
        </Button>
        <Button
          variant={statusFilter === "concluida" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("concluida")}
          data-testid="filter-concluida"
        >
          Concluídas
        </Button>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="mb-6">
        <TabsList>
          <TabsTrigger value="day" data-testid="tab-day">
            <Calendar className="w-4 h-4 mr-2" />
            Dia
          </TabsTrigger>
          <TabsTrigger value="week" data-testid="tab-week">
            <Calendar className="w-4 h-4 mr-2" />
            Semana
          </TabsTrigger>
          <TabsTrigger value="month" data-testid="tab-month">
            <Calendar className="w-4 h-4 mr-2" />
            Mês
          </TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-6">
          {isLoading ? <p>Carregando...</p> : renderDayView()}
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          {isLoading ? <p>Carregando...</p> : renderWeekView()}
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          {isLoading ? <p>Carregando...</p> : renderMonthView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
