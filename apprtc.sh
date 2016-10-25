#!/bin/sh
#####1-INSTALL
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
cd ~/Downloads/
wget https://storage.googleapis.com/golang/go1.7.1.linux-amd64.tar.gz
sudo tar -C /usr/local -xvzf go1.7.1.linux-amd64.tar.gz
cd ~/RTC/apprtc
mkdir -p ~/RTC/GO/src
export GOPATH=~/RTC/GO
ln -s `pwd`/src/collider/collidertest $GOPATH/src
ln -s `pwd`/src/collider/collidermain $GOPATH/src
ln -s `pwd`/src/collider/collider $GOPATH/src
go get collidermain
go install collidermain
sudo openssl req -x509 -newkey rsa:2048 -keyout /cert/key.pem -out /cert/cert.pem -days 99999 -nodes
$GOPATH/bin/collidermain -port=8089 -tls=true -room-server=https://apprtc-147002.appspot.co

sudo gcloud init
export PATH=$PATH:/usr/lib/google-cloud-sdk/bin:/usr/local/go/bin
gcloud beta auth application-default login

dev_appserver.py --host 0.0.0.0 --port 8084 --api_host localhost --api_port 8081 --admin_host localhost --admin_port 8082 out/app_engine/

cd ~/RTC/apprtc/out/app_engine
gcloud app deploy


#####2-ICE
sudo apt-get install stun
#Then test a server, e.g meetme.id
stun meetme.id
# or visit https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
# stun.stunprotocol.org (UDP and TCP ports 3478).


#####3-SSL
openssl req -new -x509 -newkey rsa:4096 -days 3650 -keyout privkey.pem -out server.pem
openssl rsa -in privkey.pem -out privkey.pem
sudo mv privkey.pem /cert/key.pem
sudo mv server.pem /cert/cert.pem
$GOPATH/bin/collidermain -port=8089 -tls=true -room-server=apprtc-147002.appspot.com
