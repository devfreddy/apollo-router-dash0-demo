#!/bin/bash

# Delete deployments and services in the apollo-dash0-demo namespace
kubectl delete deployment -n apollo-dash0-demo --all
kubectl delete service -n apollo-dash0-demo --all

echo "All deployments and services stopped in apollo-dash0-demo namespace"
