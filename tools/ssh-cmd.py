#!/usr/bin/env python3
"""Run a command on the OHS Gaming server via SSH."""
import sys
import paramiko

HOST = "176.123.7.53"
PORT = 22604
USER = "root"
PASS = "oh$gaming@193232"

cmd = " && ".join(sys.argv[1:]) if len(sys.argv) > 1 else "echo 'No command provided'"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=15)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
    if err:
        sys.stderr.buffer.write(err.encode('utf-8', errors='replace'))
    sys.exit(stdout.channel.recv_exit_status())
finally:
    client.close()
