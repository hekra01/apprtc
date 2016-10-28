#!/bin/bash
export PATH=$PATH:/home/hekra01/depot_tools/depot_tools
export JAVA_HOME=/usr/lib/jvm/java-8-oracle
export PATH=$PATH:/usr/local/go/bin
export GOPATH=/home/hekra01/RTC/GO
export PATH=$PATH:/home/hekra01/Downloads/GCloud/google-cloud-sdk/bin/:/home/hekra01/Downloads/GCloud/google-cloud-sdk/platform/google_appengine
export PATH=$PATH:/usr/lib/google-cloud-sdk/bin:/usr/local/go/bin:/home/hekra01/RTC/depot_tools
export ROOM_DIR=/home/hekra01/RTC/apprtc
cd $ROOM_DIR &&dev_appserver.py --host 0.0.0.0 --port 8084 --api_host localhost --api_port 8081 --admin_host localhost --admin_port 8082 out/app_engine/

