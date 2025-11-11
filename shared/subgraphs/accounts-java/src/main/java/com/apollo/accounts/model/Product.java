package com.apollo.accounts.model;

public record Product(String id) {
    public static Product fromMap(java.util.Map<String, Object> map) {
        return new Product((String) map.get("id"));
    }
}
