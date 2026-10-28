alter table process_instance add column flowable_process_id varchar(64);

create index process_instance_flowable_idx on process_instance (flowable_process_id);
