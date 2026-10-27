DROP TRIGGER activity_log_notify_push ON public.activity_log;

CREATE TRIGGER activity_log_notify_push
    AFTER INSERT ON public.activity_log
    FOR EACH ROW
    WHEN (new.type IN ('expense.created', 'expense.updated', 'settlement.recorded', 'grocery_item.assigned', 'join_requested'))
    EXECUTE FUNCTION public.notify_push();
