#!/bin/bash

CONFIG_FILE="./config.json"

DB_NAME=$(jq -r '.postgres.database' $CONFIG_FILE)
DB_USER=$(jq -r '.postgres.user' $CONFIG_FILE)
DB_PASSWORD=$(jq -r '.postgres.password' $CONFIG_FILE)
DB_HOST=$(jq -r '.postgres.host' $CONFIG_FILE)
DB_PORT=$(jq -r '.postgres.port' $CONFIG_FILE)

export PGPASSWORD=$DB_PASSWORD

LAST_BLOCK=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "SELECT last_updated_block FROM tokenfarms_health ORDER BY id DESC LIMIT 1;")

LAST_BLOCK=$(echo $LAST_BLOCK | xargs)

export THALOS_SERVER_ARGS="-n -c /etc/thalos/config.yml --start-block $LAST_BLOCK"