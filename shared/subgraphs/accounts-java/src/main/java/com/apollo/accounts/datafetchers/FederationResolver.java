package com.apollo.accounts.datafetchers;

import com.apollo.accounts.model.User;
import com.apollo.accounts.service.AccountsService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class FederationResolver {
    private final AccountsService accountsService;

    @SchemaMapping(typeName = "_Entity", field = "... on User")
    public User resolveUserReference(@Argument String id) {
        return accountsService.resolveUserReference(id);
    }
}
