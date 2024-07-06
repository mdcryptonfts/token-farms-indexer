#!/bin/bash

# Debug output
exec >> /root/token-farms-indexer/debug.log 2>&1
set -x

echo "Running get_block.sh"

# Set your database connection details
DB_NAME="wax"
DB_USER="waxdao"
DB_PASSWORD='your_password'
DB_HOST="localhost"

# Export the PGPASSWORD environment variable to use it in psql
export PGPASSWORD=$DB_PASSWORD
echo "PGPASSWORD set"

# Query the last updated block
LAST_BLOCK=$(psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT last_updated_block FROM tokenfarms_health ORDER BY id DESC LIMIT 1;")
echo "Last block queried: $LAST_BLOCK"

# Trim any leading/trailing whitespace
LAST_BLOCK=$(echo $LAST_BLOCK | xargs)

# Define the environment file path
ENV_FILE="/root/token-farms-indexer/thalos-env.conf"

# Write the THALOS_SERVER_ARGS to the environment file
echo "THALOS_SERVER_ARGS=\"-n -c /etc/thalos/config.yml --start-block $LAST_BLOCK\"" > $ENV_FILE
echo "Environment file written: $ENV_FILE"