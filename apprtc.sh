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
$GOPATH/bin/collidermain -port=8089 -tls=true


sudo gcloud init
export PATH=$PATH:/usr/lib/google-cloud-sdk/bin:/usr/local/go/bin
dev_appserver.py --api_host 0.0.0.0 --api_port 8081 --admin_host 0.0.0.0 --admin_port 8082 out/app_engine/
