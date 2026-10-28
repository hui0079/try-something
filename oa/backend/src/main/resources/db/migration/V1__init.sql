create table department (
    id bigserial primary key,
    name varchar(80) not null,
    parent_id bigint,
    leader_id bigint
);

create table app_user (
    id bigserial primary key,
    username varchar(64) not null unique,
    password_hash varchar(100) not null,
    display_name varchar(80) not null,
    department_id bigint,
    manager_id bigint,
    role varchar(20) not null,
    constraint app_user_role_chk check (role in ('EMPLOYEE', 'FINANCE', 'GM', 'ADMIN')),
    constraint app_user_department_fk foreign key (department_id) references department (id),
    constraint app_user_manager_fk foreign key (manager_id) references app_user (id)
);

alter table department
    add constraint department_parent_fk foreign key (parent_id) references department (id);

alter table department
    add constraint department_leader_fk foreign key (leader_id) references app_user (id);

create table approval_route (
    id bigserial primary key,
    biz_type varchar(20) not null,
    priority integer not null,
    min_value numeric(12, 2),
    max_value numeric(12, 2),
    steps varchar(200) not null,
    enabled boolean not null,
    constraint approval_route_biz_chk check (biz_type in ('LEAVE', 'EXPENSE'))
);

create table process_instance (
    id bigserial primary key,
    biz_type varchar(20) not null,
    biz_id bigint not null,
    applicant_id bigint not null references app_user (id),
    status varchar(20) not null,
    steps_snapshot text not null,
    current_step_index integer not null,
    started_at timestamptz not null,
    finished_at timestamptz,
    constraint process_instance_status_chk check (status in ('RUNNING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    constraint process_instance_biz_chk check (biz_type in ('LEAVE', 'EXPENSE'))
);

create index process_instance_biz_idx on process_instance (biz_type, biz_id);

create table approval_task (
    id bigserial primary key,
    instance_id bigint not null references process_instance (id),
    step_index integer not null,
    step_code varchar(40) not null,
    assignee_id bigint not null references app_user (id),
    status varchar(20) not null,
    comment varchar(500),
    acted_at timestamptz,
    constraint approval_task_status_chk check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

create index approval_task_assignee_status_idx on approval_task (assignee_id, status);

create table leave_request (
    id bigserial primary key,
    applicant_id bigint not null references app_user (id),
    leave_type varchar(20) not null,
    start_date date not null,
    end_date date not null,
    days numeric(6, 1) not null,
    reason varchar(500) not null,
    status varchar(20) not null,
    current_instance_id bigint references process_instance (id),
    constraint leave_request_type_chk check (leave_type in ('ANNUAL', 'SICK', 'PERSONAL')),
    constraint leave_request_status_chk check (status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

create index leave_request_applicant_idx on leave_request (applicant_id);

create table expense_request (
    id bigserial primary key,
    applicant_id bigint not null references app_user (id),
    category varchar(20) not null,
    amount numeric(12, 2) not null,
    reason varchar(500) not null,
    status varchar(20) not null,
    current_instance_id bigint references process_instance (id),
    constraint expense_request_category_chk check (category in ('TRAVEL', 'OFFICE', 'ENTERTAINMENT', 'OTHER')),
    constraint expense_request_status_chk check (status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

create index expense_request_applicant_idx on expense_request (applicant_id);
