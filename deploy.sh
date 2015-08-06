#!/bin/bash -e

hostname=$1

if [ -z $hostname ]; then
  echo "Usage: ./deploy <HOSTNAME>"
  exit 1
fi

echo -e "\nInstalling Node.js\n"
ssh -tt $hostname 'curl -sL https://rpm.nodesource.com/setup | sudo bash -'
ssh -tt $hostname 'sudo yum install -y nodejs'

echo -e "\nInstalling MySQL\n"
ssh -tt $hostname 'sudo yum install -y mysql mysqld && sudo service mysqld restart'

echo -e "\nInstalling image tools\n"
ssh -tt $hostname 'sudo yum install -y ImageMagick'

echo -e "\nInstalling application\n"
ssh $hostname 'mkdir -p app'
rsync --exclude node_modules --exclude .git -avzhe ssh . $hostname:app
ssh -tt $hostname "cd app && sudo ./start-server.sh"
