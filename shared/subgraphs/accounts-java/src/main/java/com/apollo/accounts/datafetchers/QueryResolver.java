package com.apollo.accounts.datafetchers;

import com.apollo.accounts.model.Product;
import com.apollo.accounts.model.User;
import com.apollo.accounts.service.AccountsService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class QueryResolver {
    private final AccountsService accountsService;

    @QueryMapping
    public User me() {
        return accountsService.getMe();
    }

    @QueryMapping
    public User user(@Argument String id) {
        return accountsService.getUserById(id).orElse(null);
    }

    @QueryMapping
    public List<User> users() {
        return accountsService.getAllUsers();
    }

    @QueryMapping
    public List<Product> recommendedProducts() {
        return accountsService.getRecommendedProducts();
    }
}
