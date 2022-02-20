import subprocess
from core import co_definitions
from core import co_terminal
from core import co_file

class Terminal(co_terminal.TerminalLayer):
	def __init__(self):
		co_terminal.TerminalLayer.__init__(self)
		self.Handlers["echo"] =	self.EchoHandler

	def EchoHandler(self, data):
		pass

	def Close(self):
		self.Exit()