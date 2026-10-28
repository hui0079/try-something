package com.oa.approval;

import com.oa.org.Role;

public record Person(long id, Role role, Long managerId, Long departmentLeaderId) {
}
