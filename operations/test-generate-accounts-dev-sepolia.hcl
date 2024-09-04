job "test-generate-accounts-dev-sepolia" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    task "test-generate-accounts-sepolia-task" {
        driver = "docker"

        config {
            network_mode = "host"
            image = "ghcr.io/anyone-protocol/facilitator:0.4.20"
            entrypoint = ["npx"]
            command = "hardhat"
            args = ["run", "--network", "sepolia", "scripts/generate-accounts.ts"]
        }

        vault {
            policies = ["facilitator-sepolia-dev"]
        }

        template {
            data = <<EOH
            {{with secret "kv/facilitator/sepolia/dev"}}
                CONSUL_TOKEN="{{.Data.data.CONSUL_TOKEN}}"
                JSON_RPC="{{.Data.data.JSON_RPC}}"
                FACILITATOR_OPERATOR_KEY="{{.Data.data.FACILITATOR_OPERATOR_KEY}}"
            {{end}}
            EOH
            destination = "secrets/file.env"
            env         = true
        }

        env {
            PHASE="dev"
            CONSUL_IP="127.0.0.1"
            CONSUL_PORT="8500"
            FACILITATOR_CONSUL_KEY="facilitator/sepolia/dev/address"
            TEST_ACCOUNTS_KEY="facilitator/sepolia/dev/test-accounts"
        }

        restart {
            attempts = 0
            mode = "fail"
        }

        resources {
            cpu    = 4096
            memory = 4096
        }
    }
}
