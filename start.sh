#!/bin/bash

LOG_FILE="/root/token-farms-indexer/start.log"
PID_FILE="/root/token-farms-indexer/thalos-server.pid"
ENV_FILE="/root/token-farms-indexer/thalos-env.conf"

echo "Starting thalos-server at $(date)" | tee -a $LOG_FILE

# Run the get_block.sh script to create the environment file
/root/token-farms-indexer/get_block.sh 2>&1 | tee -a $LOG_FILE

# Source the environment variables
source $ENV_FILE

# Start the thalos-server in the background
nohup /usr/bin/thalos-server $THALOS_SERVER_ARGS >> $LOG_FILE 2>&1 &

# Give the server a moment to start and then capture the PID
sleep 1
THALOS_PID=$(pgrep -f "/usr/bin/thalos-server $THALOS_SERVER_ARGS")
echo $THALOS_PID > $PID_FILE

echo "thalos-server started with PID $(cat $PID_FILE)" | tee -a $LOG_FILE