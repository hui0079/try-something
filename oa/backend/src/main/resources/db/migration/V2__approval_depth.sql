alter table approval_task drop constraint approval_task_status_chk;

alter table approval_task
    add constraint approval_task_status_chk
        check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'TRANSFERRED'));

create table attachment (
    id bigserial primary key,
    biz_type varchar(20) not null,
    biz_id bigint not null,
    original_name varchar(255) not null,
    stored_name varchar(80) not null unique,
    content_type varchar(120) not null,
    size_bytes bigint not null,
    uploader_id bigint not null references app_user (id),
    created_at timestamptz not null,
    constraint attachment_biz_chk check (biz_type in ('LEAVE', 'EXPENSE'))
);

create index attachment_biz_idx on attachment (biz_type, biz_id);

create table process_cc (
    id bigserial primary key,
    instance_id bigint not null references process_instance (id),
    user_id bigint not null references app_user (id),
    read_at timestamptz,
    constraint process_cc_unique unique (instance_id, user_id)
);

create index process_cc_user_idx on process_cc (user_id);

create table notice (
    id bigserial primary key,
    user_id bigint not null references app_user (id),
    biz_type varchar(20) not null,
    biz_id bigint not null,
    kind varchar(20) not null,
    title varchar(120) not null,
    body varchar(500) not null,
    read_at timestamptz,
    created_at timestamptz not null,
    constraint notice_kind_chk check (kind in ('URGE', 'CC', 'TASK', 'RESULT')),
    constraint notice_biz_chk check (biz_type in ('LEAVE', 'EXPENSE'))
);

create index notice_user_idx on notice (user_id, created_at desc);

create table urge_log (
    id bigserial primary key,
    instance_id bigint not null references process_instance (id),
    step_index integer not null,
    created_at timestamptz not null
);

create index urge_log_instance_idx on urge_log (instance_id, step_index, created_at desc);
