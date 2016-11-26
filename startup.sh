#!/bin/bash
export PATH=$PATH:$HOME/RTC/depot_tools
export JAVA_HOME=/usr/lib/jvm/java-8-oracle
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/RTC/GO
export PATH=$PATH:$HOME/google-cloud-sdk/bin/:$HOME/google-cloud-sdk/platform/google_appengine
export PATH=$PATH:/usr/lib/google-cloud-sdk/bin:/usr/local/go/bin:$HOME/RTC/depot_tools
export ROOM_DIR=$HOME/RTC/apprtc
cd $ROOM_DIR &&dev_appserver.py --host 0.0.0.0 --port 8084 --api_host localhost --api_port 8081 --admin_host localhost --admin_port 8082 out/app_engine/

