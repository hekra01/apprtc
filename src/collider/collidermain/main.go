// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package main

import (
	"collider"
	"flag"
	"log"
)

var tls = flag.Bool("tls", true, "whether TLS is used")
var port = flag.Int("port", 443, "The TCP port that the server listens on")
var roomSrv = flag.String("room-server", "https://apprtc.appspot.com", "The origin of the room server")
var crtpath = flag.String("crt-path", "/cert/cert.pem", "The path of the certificate, when TLS is used")
var keypath = flag.String("key-path", "/cert/key.pem", "The path of the key, when TLS is used")

func main() {
	flag.Parse()

	log.Printf("Starting collider: tls = %t, port = %d, room-server=%s", *tls, *port, *roomSrv)

	c := collider.NewCollider(*roomSrv)
	c.Run(*port, *tls, *crtpath, *keypath)
}
