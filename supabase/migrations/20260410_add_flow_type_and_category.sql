alter table obligations
  add column if not exists flow_type text not null default 'other',
  add column if not exists category text not null default 'other';

alter table scheduled_payments
  add column if not exists flow_type text not null default 'other',
  add column if not exists category text not null default 'other';

update obligations
set flow_type = case
  when lower(type) in ('rent', 'subscription', 'contractor', 'utilities', 'opex') then 'operating'
  when lower(type) in ('loan', 'credit', 'principal', 'interest', 'loan_payment') then 'financial'
  when lower(type) in ('tax', 'vat') then 'tax'
  when lower(type) in ('salary', 'payroll') then 'payroll'
  when lower(type) in ('capex', 'investment', 'investing') then 'investing'
  else 'other'
end
where flow_type = 'other';

update obligations
set category = coalesce(nullif(lower(type), ''), 'other')
where category = 'other';

update scheduled_payments sp
set flow_type = o.flow_type,
    category = o.category
from obligations o
where o.id = sp.obligation_id
  and (sp.flow_type = 'other' or sp.category = 'other');

alter table obligations
  drop constraint if exists obligations_flow_type_check;

alter table obligations
  add constraint obligations_flow_type_check
  check (flow_type in ('operating', 'financial', 'tax', 'payroll', 'investing', 'other'));

alter table scheduled_payments
  drop constraint if exists scheduled_payments_flow_type_check;

alter table scheduled_payments
  add constraint scheduled_payments_flow_type_check
  check (flow_type in ('operating', 'financial', 'tax', 'payroll', 'investing', 'other'));
