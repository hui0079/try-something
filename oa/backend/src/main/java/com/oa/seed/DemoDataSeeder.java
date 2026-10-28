package com.oa.seed;

import com.oa.approval.ApprovalRoute;
import com.oa.approval.ApprovalRouteRepository;
import com.oa.approval.BizType;
import com.oa.org.Department;
import com.oa.org.DepartmentRepository;
import com.oa.org.Role;
import com.oa.org.UserAccount;
import com.oa.org.UserAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final DepartmentRepository departments;
    private final UserAccountRepository users;
    private final ApprovalRouteRepository routes;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(
            DepartmentRepository departments,
            UserAccountRepository users,
            ApprovalRouteRepository routes,
            PasswordEncoder passwordEncoder
    ) {
        this.departments = departments;
        this.users = users;
        this.routes = routes;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByUsernameIgnoreCase("admin")) {
            return;
        }
        Department office = department("总经办", null);
        Department engineering = department("研发部", office);
        Department financeDept = department("财务部", office);

        UserAccount gm = user("gm", "gm123", "周总", office, null, Role.GM);
        UserAccount lead = user("lead", "lead123", "李负责人", engineering, gm, Role.EMPLOYEE);
        UserAccount bob = user("bob", "bob123", "赵小红", engineering, lead, Role.EMPLOYEE);
        user("alice", "alice123", "王小明", engineering, bob, Role.EMPLOYEE);
        UserAccount finance = user("finance", "finance123", "陈财务", financeDept, gm, Role.FINANCE);
        user("admin", "admin123", "系统管理员", null, null, Role.ADMIN);

        office.setLeader(gm);
        engineering.setLeader(lead);
        financeDept.setLeader(finance);

        route(BizType.LEAVE, 10, null, new BigDecimal("3"), "DIRECT_MANAGER");
        route(BizType.LEAVE, 20, new BigDecimal("3"), null, "DIRECT_MANAGER,DEPT_HEAD");
        route(BizType.EXPENSE, 10, null, new BigDecimal("1000"), "DIRECT_MANAGER");
        route(BizType.EXPENSE, 20, new BigDecimal("1000"), new BigDecimal("5000"), "DIRECT_MANAGER,FINANCE");
        route(BizType.EXPENSE, 30, new BigDecimal("5000"), null, "DIRECT_MANAGER,FINANCE,GM");
        log.info("已写入演示组织和预置审批规则");
    }

    private Department department(String name, Department parent) {
        Department department = new Department();
        department.setName(name);
        department.setParent(parent);
        return departments.save(department);
    }

    private UserAccount user(
            String username,
            String password,
            String displayName,
            Department department,
            UserAccount manager,
            Role role
    ) {
        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(displayName);
        user.setDepartment(department);
        user.setManager(manager);
        user.setRole(role);
        return users.save(user);
    }

    private void route(BizType bizType, int priority, BigDecimal minValue, BigDecimal maxValue, String steps) {
        ApprovalRoute route = new ApprovalRoute();
        route.setBizType(bizType);
        route.setPriority(priority);
        route.setMinValue(minValue);
        route.setMaxValue(maxValue);
        route.setSteps(steps);
        route.setEnabled(true);
        routes.save(route);
    }
}
