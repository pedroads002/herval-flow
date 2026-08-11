# Herval Flow

Build a complete, production-ready internal commercial operations management system called:

Herval Flow

This is NOT a prototype, mockup, or MVP.

Build the complete functional application from the beginning, including frontend, backend, database, authentication, authorization, business rules, responsive behavior, persistence, validation, error handling, empty states, loading states, and production-ready architecture.

The system will be used internally by Herval Marketing to manage the commercial operation of dental, aesthetics, and advanced aesthetics clinics.

IMPORTANT:

Do not invent unrelated features.

Do not add unnecessary complexity.

Do not build a generic CRM.

The product must be highly focused on commercial execution, operational control, manager intervention, lead processing, appointments, attendance, follow-up, and performance management.

==================================================

1. LANGUAGE

==================================================

The entire application must be in Brazilian Portuguese (pt-BR).

This includes:

- navigation

- buttons

- labels

- forms

- validation messages

- errors

- notifications

- dashboards

- tables

- filters

- tooltips

- empty states

- confirmation dialogs

- system messages

- date formatting

- numbers

- status names

Do not expose English UI text to the final user.

Code, variable names, database fields, and internal architecture may use English.

==================================================

2. BRAND IDENTITY

==================================================

The application belongs to Herval Marketing.

Use the attached Herval Marketing logo as the primary visual reference and logo asset.

There are two uploaded versions of the logo:

- light-background version

- dark-background version

Use the appropriate version automatically depending on the active theme.

The visual identity must follow the logo:

Primary colors:

- Black

- White

- Herval green / vivid neon green

The green should be used strategically for:

- primary actions

- positive states

- highlights

- active navigation

- important indicators

- selected elements

- success states

Do NOT turn the entire interface green.

The overall visual language should be:

- premium

- modern

- professional

- minimal

- clean

- operational

- highly readable

- fast

- sophisticated

- SaaS-quality

Avoid:

- excessive gradients

- excessive rounded cards

- childish visual elements

- excessive animations

- visual clutter

- unnecessary illustrations

- generic template aesthetics

The application should feel like a serious internal commercial command center.

==================================================

3. THEMING

==================================================

Implement a complete theme system:

- System

- Light

- Dark

Persist the user's theme preference.

The Light theme must use:

- white/light backgrounds

- black typography

- subtle neutral surfaces

- Herval green accents

The Dark theme must use:

- near-black backgrounds

- white/light typography

- dark neutral surfaces

- Herval green accents

The System option must automatically follow the operating system preference.

The logo must adapt correctly to the selected theme.

==================================================

4. RESPONSIVE / MOBILE-FIRST

==================================================

The entire system must be fully responsive.

Desktop, tablet, and mobile are all first-class experiences.

Do NOT simply shrink the desktop interface.

On mobile:

- navigation must become mobile-friendly

- tables must transform into readable cards or appropriate mobile layouts

- filters must remain usable

- buttons must have appropriate touch targets

- forms must be optimized for mobile

- dashboards must remain readable

- lead details must be easy to operate with one hand

- no horizontal overflow

- no broken layouts

- no clipped text

- no inaccessible controls

The system will frequently be used during real commercial operations, including from mobile devices.

==================================================

5. USERS AND ROLES

==================================================

There are two primary roles:

1. GESTOR COMERCIAL

2. ESTAGIÁRIA / CRC

The manager is responsible for the overall commercial operation.

The interns/CRCs operate the daily commercial process.

IMPORTANT BUSINESS RULE:

All clinics created by the manager must automatically be visible and accessible to the CRC users.

There is NO fixed clinic ownership such as:

- CRC A = clinics 1–4

- CRC B = clinics 5–8

The operation is shared.

Any authorized CRC can operate any active clinic.

The manager can:

- create clinics

- edit clinics

- deactivate clinics

- view all clinics

- view all leads

- view all operations

- view all metrics

- view all CRC activity

- intervene in leads

- manage the commercial operation

CRC users can:

- access all active clinics

- process leads

- update lead status

- schedule appointments

- confirm appointments

- register attendance

- register no-shows

- perform operational follow-up

- manage operational pending tasks

- flag leads for manager intervention

The permission system must be enforced server-side, not only visually.

Use secure authentication and authorization.

==================================================

6. CORE PRODUCT PHILOSOPHY

==================================================

Herval Flow is NOT designed to make the manager do everything.

The operational philosophy is:

"Elas movimentam.

Você converte."

The system must separate:

OPERATIONAL EXECUTION

from

COMMERCIAL INTERVENTION.

The CRC should be able to keep the machine moving without constantly asking the manager for help.

The manager should primarily see the situations where his intervention has commercial value.

The system must therefore answer two questions:

FOR THE CRC:

"O que eu preciso fazer agora?"

FOR THE MANAGER:

"Onde minha intervenção pode gerar dinheiro agora?"

==================================================

7. MAIN NAVIGATION

==================================================

Create a clean main navigation with at least:

- Painel

- Leads

- Clínicas

- Agenda

- Follow-ups

- Intervenção do Gestor

- Relatórios

- Equipe

- Configurações

Navigation visibility should respect the user's role.

The manager should have access to the full operational view.

CRC users should have access to the operational areas relevant to execution.

==================================================

8. MANAGER DASHBOARD

==================================================

Create a high-quality "Painel do Gestor".

It must provide an immediate operational overview.

Show:

- leads recebidos

- leads em atendimento

- leads agendados

- consultas confirmadas

- comparecimentos

- no-shows

- reagendamentos

- leads pendentes

- leads aguardando intervenção

- conversões / vendas when recorded

Allow filtering by:

- período

- clínica

- CRC

- status

Include a prominent:

"INTERVENÇÃO DO GESTOR"

queue.

This queue must surface leads requiring manager action.

Examples:

- Ligação necessária

- Lead quente

- Objeção

- Recuperação

- No-show importante

The manager should be able to open the lead directly from this queue.

==================================================

9. CRC DASHBOARD

==================================================

Create a dedicated operational dashboard for CRC users.

The primary purpose is execution.

The dashboard should clearly show:

- novos leads

- leads para trabalhar

- leads aguardando resposta

- follow-ups de hoje

- confirmações de hoje

- consultas de hoje

- consultas de amanhã

- no-shows pendentes

- leads que precisam de atenção

- manager interventions pending

Prioritize actionable tasks over vanity metrics.

The dashboard should make it obvious what needs to be done next.

==================================================

10. CLINICS

==================================================

Create a complete Clinics module.

Each clinic should have:

- clinic name

- responsible professional

- specialty/category

- contact information

- WhatsApp

- Instagram

- operational notes

- active/inactive status

- creation date

Allow the manager to:

- create

- edit

- deactivate

- reactivate

- search

- filter

All clinics created by the manager must automatically become available to CRC users.

Do NOT duplicate clinic records per user.

There must be one canonical clinic record.

==================================================

11. LEADS

==================================================

Create a complete Leads module.

A lead belongs to exactly one clinic.

Lead fields should include:

- name

- phone

- WhatsApp

- Instagram

- source

- clinic

- creation date

- current status

- assigned/operating CRC when applicable

- appointment date

- confirmation status

- attendance status

- loss reason

- notes

- last interaction

- next follow-up

- manager intervention status

- creation timestamp

- update timestamp

The system must maintain an activity history/timeline for important lead changes.

==================================================

12. LEAD PIPELINE

==================================================

Use a clear operational pipeline.

Recommended statuses:

1. Novo Lead

2. Em Contato

3. Follow-up

4. Agendado

5. Confirmado

6. Compareceu

7. No-show

8. Reagendamento

9. Perdido

10. Convertido / Venda

Status transitions must be validated.

Do not allow contradictory states.

For example:

A lead cannot simultaneously be:

- Compareceu

and

- No-show

A lead cannot have multiple active appointment records representing the same appointment.

==================================================

13. DUPLICATE PREVENTION

==================================================

This is a critical business rule.

The system must prevent accidental duplicate leads and duplicate appointments.

Before creating a lead, check for existing matching records using available identifying information such as:

- phone

- WhatsApp

- Instagram

- clinic

- name

Do not blindly create duplicates.

If a likely duplicate exists, clearly warn the user in Portuguese.

Example:

"Lead já existente."

Then show the existing lead and allow the user to open it instead of creating another record.

Appointments must also have duplicate protection.

A lead must not have multiple identical appointment records with the same:

- lead

- clinic

- appointment date/time

The database must enforce uniqueness where appropriate.

Do not rely only on frontend validation.

==================================================

14. APPOINTMENTS

==================================================

Create a dedicated Agenda module.

The agenda must show:

- today's appointments

- tomorrow's appointments

- upcoming appointments

- confirmed appointments

- attended appointments

- no-shows

- rescheduled appointments

The manager and CRC must be able to record:

- agendamento

- confirmação

- comparecimento

- no-show

- reagendamento

Appointment information should remain connected to the lead and clinic.

Do not duplicate lead records when an appointment status changes.

==================================================

15. FOLLOW-UP

==================================================

Create a dedicated Follow-up operational area.

The system should show:

- follow-ups due today

- overdue follow-ups

- upcoming follow-ups

- leads without response

- leads requiring recovery

Each follow-up must be connected to:

- lead

- clinic

- responsible CRC

- date

- status

- notes

The system must make overdue operational work highly visible.

==================================================

16. MANAGER INTERVENTION

==================================================

This is a central feature.

Create a dedicated "Intervenção do Gestor" queue.

CRC users must be able to flag a lead for manager intervention.

Reasons:

- Ligação necessária

- Objeção

- Lead quente

- Recuperação

- No-show importante

- Outro

The manager must be able to:

- view

- open lead

- resolve intervention

- add note

- change status

- return lead to operation

- mark intervention as completed

The CRC should NOT need to send a separate WhatsApp message to the manager just to request help.

The system itself is the operational communication layer.

==================================================

17. DAILY OPERATION

==================================================

The system must reflect the real operating model.

MORNING:

- confirmations

- new leads

- initial processing

- urgent commercial opportunities

AFTERNOON:

- follow-ups

- recovery

- unresolved leads

- manager interventions

- conversion opportunities

END OF DAY:

- next-day confirmations

- pending work

- operational organization

Do not hard-code arbitrary schedules.

Make the system date-aware and configurable where necessary.

==================================================

18. HANDOFF BETWEEN CRC AND MANAGER

==================================================

The system must support a clean handoff.

Example:

Lead enters

→ CRC processes lead

→ lead responds

→ lead becomes commercially relevant

→ CRC flags manager intervention

→ manager receives lead in intervention queue

→ manager calls / handles objection

→ manager updates result

→ lead returns to operational flow or progresses to appointment

This should be visible in the lead timeline.

==================================================

19. REPORTS

==================================================

Create a Reports module.

The manager must be able to analyze:

- total leads

- leads by clinic

- leads by CRC

- appointments

- confirmations

- attendance

- no-show rate

- rescheduling

- conversion

- lost leads

- intervention volume

- operational productivity

Allow filters by:

- date range

- clinic

- CRC

- status

Use clear charts and tables.

Do not create misleading metrics.

Every metric must be calculated from real persisted database data.

==================================================

20. CRC PERFORMANCE

==================================================

Create performance visibility for the manager.

Show operational metrics such as:

- leads processed

- follow-ups completed

- confirmations completed

- appointments handled

- pending tasks

- overdue tasks

- intervention requests

- response/activity volume

Do not use punitive scoring systems unless explicitly requested later.

Focus on visibility and management.

==================================================

21. LEAD DETAIL PAGE

==================================================

Create a high-quality lead detail page.

It should contain:

- lead information

- clinic

- current status

- appointment information

- confirmation

- attendance

- follow-up

- notes

- intervention status

- complete timeline

The timeline should clearly show important events such as:

- lead created

- status changed

- appointment created

- appointment confirmed

- attendance registered

- no-show registered

- follow-up created/completed

- intervention requested

- intervention resolved

==================================================

22. QUICK ACTIONS

==================================================

Prioritize fast operation.

Include obvious actions such as:

- Novo Lead

- Agendar

- Confirmar

- Registrar Comparecimento

- Registrar No-show

- Criar Follow-up

- Solicitar Intervenção

Actions must be fast and require minimal clicks.

On mobile, use an accessible floating "+" action button for the most important creation/action flows.

The "+" button must open a contextual quick-action menu.

==================================================

23. SEARCH AND FILTERING

==================================================

All major operational modules must have fast search and useful filters.

Leads:

- name

- phone

- Instagram

- clinic

- status

- date

- CRC

Appointments:

- clinic

- date

- status

- CRC

Interventions:

- reason

- clinic

- status

- date

Reports:

- period

- clinic

- CRC

==================================================

24. DATA INTEGRITY

==================================================

This is a production system.

Do not use fake persistence.

Do not use local-only state as the source of truth.

All important business data must be persisted in the database.

Implement:

- validation

- database constraints

- duplicate prevention

- safe updates

- transactional operations where necessary

- proper error handling

- loading states

- empty states

- optimistic UI only when safe

Never silently fail.

If an operation fails, show a clear Portuguese error message.

==================================================

25. DATABASE

==================================================

Use a relational database architecture.

Prefer Supabase/PostgreSQL if available and appropriate for the Lovable environment.

Create proper entities for at least:

- User

- Clinic

- Lead

- Appointment

- FollowUp

- LeadEvent / Activity

- ManagerIntervention

Use foreign keys and appropriate indexes.

Implement proper authorization and row-level security where supported.

Do not expose data between unauthorized users.

==================================================

26. AUTHENTICATION

==================================================

Implement secure authentication.

Users must log in.

Support at least:

- Gestor Comercial

- Estagiária / CRC

The role must be stored and enforced.

Do not rely on frontend role checks alone.

==================================================

27. SETTINGS

==================================================

Create settings for:

- profile

- theme

- notifications/preferences where applicable

- role information

Theme options:

- System

- Light

- Dark

Persist the choice.

==================================================

28. UX PRINCIPLES

==================================================

Every screen must prioritize:

1. Clarity

2. Speed

3. Actionability

4. Consistency

5. Readability

The user should never have to wonder:

"What do I do next?"

Important actions should be visually obvious.

Avoid unnecessary confirmation dialogs for harmless actions.

Use confirmation dialogs for destructive actions.

Use toast notifications for successful operations.

Use clear error messages for failures.

==================================================

29. DESIGN SYSTEM

==================================================

Create a consistent design system based on Herval Marketing.

Typography:

- modern sans-serif

- strong hierarchy

- excellent readability

Cards:

- subtle borders

- restrained radius

- clear hierarchy

Buttons:

- primary green

- secondary neutral

- destructive red only when necessary

Status indicators should be visually distinct but restrained.

Use icons consistently.

Do not overuse color.

The green Herval identity should feel premium rather than aggressive.

==================================================

30. LOGO

==================================================

Use the uploaded Herval Marketing logo as the official application branding.

Do not recreate the logo manually.

Use the supplied image assets.

Use the correct version for light/dark backgrounds.

Place the logo appropriately in:

- login

- sidebar/header

- application identity

- relevant empty states when appropriate

==================================================

31. EMPTY STATES

==================================================

Every list must have a useful empty state.

Examples:

"No momento, não há leads nesta etapa."

"Nenhuma consulta encontrada para este período."

"Nenhuma intervenção pendente."

"Você não possui follow-ups pendentes hoje."

Empty states should provide a relevant next action whenever appropriate.

==================================================

32. ERROR HANDLING

==================================================

All errors must be understandable in Brazilian Portuguese.

Examples:

"Lead já existente."

"Não foi possível registrar o agendamento."

"Não foi possível salvar as alterações."

"Você não tem permissão para realizar esta ação."

"Esta consulta já foi registrada."

Never show raw database errors to the user.

==================================================

33. PERFORMANCE

==================================================

The system must feel fast.

Optimize:

- database queries

- unnecessary rerenders

- large lead lists

- dashboard calculations

- filters

- mobile rendering

Do not load unnecessary data.

Use pagination or efficient querying for large datasets.

==================================================

34. IMPORTANT: DO NOT INVENT DATA

==================================================

Do not create fake clinics, fake leads, fake appointments, fake performance numbers, or fake users.

The system should start empty except for the necessary initial authenticated manager account/setup.

Provide clean onboarding so the manager can create the real clinics and users.

==================================================

35. IMPORTANT: DO NOT CREATE UNREQUESTED FEATURES

==================================================

Do NOT add:

- billing

- financial management

- marketing automation

- AI chatbot

- email marketing

- social media automation

- complex ERP functionality

- unnecessary integrations

- public customer portal

- subscription system

- multi-company SaaS features

These are outside the current scope.

Herval Flow is an internal commercial operations system.

==================================================

36. QUALITY CONTROL

==================================================

Before considering the implementation complete, test the entire application flow.

Verify:

- authentication

- role permissions

- clinic creation

- clinic visibility for CRC users

- lead creation

- duplicate prevention

- appointment creation

- appointment duplicate prevention

- appointment confirmation

- attendance registration

- no-show

- rescheduling

- follow-up creation

- follow-up completion

- manager intervention

- intervention resolution

- dashboard calculations

- reports

- search

- filters

- mobile responsiveness

- light theme

- dark theme

- system theme

- error states

- empty states

- persistence after refresh

- logout/login

- database integrity

Do not declare functionality complete if it only works visually.

Everything must be connected to real persisted data.

==================================================

37. FINAL PRODUCT EXPERIENCE

==================================================

The final Herval Flow experience should feel like:

A commercial command center for Herval Marketing.

The CRC opens the system and immediately knows:

"What do I need to execute?"

The manager opens the system and immediately knows:

"What needs my attention?"

The system should reduce operational friction, eliminate unnecessary manual organization, prevent duplicate records, centralize the commercial operation of all clinics, and allow the manager to spend more time on high-value commercial intervention instead of repetitive operational work.

Build this as a polished, production-ready internal application.

Do not stop at a visual prototype.

Implement the actual functional system. [Portuguese - BR]

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://herval-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/65518e69-7a50-4a75-8931-84c0623d9828).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
