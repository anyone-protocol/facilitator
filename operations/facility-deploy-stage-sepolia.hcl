job "facility-deploy-stage-sepolia" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    task "deploy-facility-stage-task" {
        driver = "docker"

        config {
            network_mode = "host"
            image = "ghcr.io/ator-development/facilitator:0.4.18"
            entrypoint = ["npx"]
            command = "hardhat"
            args = ["run", "--network", "sepolia", "scripts/deploy.ts"]
        }

        vault {
            policies = ["facilitator-stage-sepolia"]
        }

        template {
            data = <<EOH
            {{with secret "kv/facilitator/sepolia/stage"}}
                FACILITATOR_DEPLOYER_KEY="{{.Data.data.FACILITATOR_DEPLOYER_KEY}}"
                CONSUL_TOKEN="{{.Data.data.CONSUL_TOKEN}}"
                JSON_RPC="{{.Data.data.JSON_RPC}}"
                FACILITATOR_OPERATOR_ADDRESS="{{.Data.data.FACILITATOR_OPERATOR_ADDRESS}}"
            {{end}}
            EOH
            destination = "secrets/file.env"
            env         = true
        }

        env {
            PHASE="stage"
            CONSUL_IP="127.0.0.1"
            CONSUL_PORT="8500"
            FACILITATOR_CONSUL_KEY="facilitator/sepolia/stage/address"
            ATOR_TOKEN_CONSUL_KEY="ator-token/sepolia/stage/address"
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
