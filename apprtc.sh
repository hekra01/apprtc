#!/bin/sh
#-INSTALL
sudo npm -g install grunt-cli
sudo apt-get install python-pip
sudo apt-get install python-webtest
sudo npm install
grunt build

export CLOUD_SDK_REPO="cloud-sdk-$(lsb_release -c -s)"
echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
# If permission error
# sudo chown -R $USER /home/$USER/.config/gcloud
# chmod -R +w /home/$USER/.config/gcloud
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install google-cloud-sdk
sudo pip install --upgrade google-cloud
cd ~/RTC/apprtc

sudo gcloud init
export PATH=$PATH:/usr/lib/google-cloud-sdk/bin:/usr/local/go/bin
gcloud beta auth application-default login

dev_appserver.py --host 0.0.0.0 --port 8084 --api_host localhost --api_port 8081 --admin_host localhost --admin_port 8082 out/app_engine/

#-Ubuntu service
sudo ln -sr ./roomserver /etc/init.d/roomserver
sudo update-rc.d roomserver defaults
