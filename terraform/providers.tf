terraform {
  required_version = ">= 1.0"
  required_providers {
    dash0 = {
      source  = "dash0hq/dash0"
      version = ">= 1.0"
    }
  }
}

provider "dash0" {
  # Dash0 API token is passed via environment variable DASH0_AUTH_TOKEN
  # Set by terraform.sh script from DASH0_AUTHORIZATION_TOKEN in .env
}
