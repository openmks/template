#!/usr/bin/python
import signal
import argparse

from classes import terminal
from classes import application

def signal_handler(signal, frame):
	pass

class Node():
	def __init__(self):
		self.CLI = None
		self.APP = None
	
	def NodeUnhandledError(self):
		self.CLI.Close()

	def Start(self):
		self.CLI = terminal.Terminal()
		self.APP = application.Application()
		self.APP.ErrorCallback = self.NodeUnhandledError

		status = self.APP.Run()
		if status is True:
			if self.APP.FatalError is False:
				self.CLI.Run() # Blocking
				self.CLI.Close()
	
def main():
	signal.signal(signal.SIGINT, signal_handler)

	parser = argparse.ArgumentParser(description='Execution module\n Example: python.exe main.py')
	parser.add_argument('-v', '--version', action='store_true',
			help='Version')
	parser.add_argument('-verb', '--verbose', action='store_true',
			help='Print messages')
	
	args = parser.parse_args()

	node = Node()
	node.Start()
	
	print("Bye.")

if __name__ == "__main__":
    main()
