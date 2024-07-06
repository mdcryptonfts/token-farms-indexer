#!/bin/bash

LOG_FILE="/root/token-farms-indexer/stop.log"
PID_FILE="/root/token-farms-indexer/thalos-server.pid"

if [ -f $PID_FILE ]; then
  PID=$(cat $PID_FILE)
  echo "Stopping thalos-server with PID $PID at $(date)" | tee -a $LOG_FILE
  kill $PID

  # Check if the process was killed successfully
  if [ $? -eq 0 ]; then
    echo "thalos-server stopped successfully" | tee -a $LOG_FILE
    rm $PID_FILE
  else
    echo "Failed to stop thalos-server" | tee -a $LOG_FILE
  fi
else
  echo "PID file not found. Is thalos-server running?" | tee -a $LOG_FILE
fi