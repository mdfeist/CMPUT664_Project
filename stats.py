import sys
import os

projects = []

class Project:
    def __init__(self):
        self._dir = ""
        self._commits = []

    def setDir(self, name):
        self._dir = name

    def getDir(self):
        return self._dir

    def addCommit(self, commit):
        self._commits.append(commit)

    def getCommits(self):
        return self._commits

    def getJSON(self):
        dump = self._dir
        libs_csv = ""
        libs = set()
        author_names = set()
        authors = {}

        # Get authors and libs used in project
        for commit in self._commits:
            author = commit.getAuthor()
            author_names.add(author)

            for f in commit.getFiles():
                for lib in f.getLibs().getHist():
                    libs.add(lib)

        # Create authors and set up lib histogram
        for author in author_names:
            authors[author] = Author()
            authors[author].setName(author)

            author_libs = authors[author].getLibs()

            for lib in libs:
                author_libs.add(lib, 0)

        # Get libs and histogram for each author
        for commit in self._commits:
            name = commit.getAuthor()
            author = authors[name]

            for f in commit.getFiles():
                for lib, count in f.getLibs().getHist().items():
                    author.getLibs().add(lib, count)

        # Get Stats
        # Get dump of authors
        for key, author in authors.items():
            # Get dump for author
            dump += author.toStr("\t")

            # Libs
            libs_hist = author.getLibs().getHist()

            if libs_csv == "":
                libs_csv += "Project, Author, "
                for name in libs_hist:
                    libs_csv += name + ", "

                libs_csv += "\n"

            if len(libs_hist) > 0:
                libs_csv += self._dir + ", " + author.getName().replace(",", "") + ", "
                count = 0
                total = 0
                touched = 0
                for value in libs_hist.itervalues():
                    libs_csv += str(value) + ", "

                    if value > 0:
                        touched += 1
                    count += 1

                    total += value

                libs_csv += "\n"

        #Libs

        return json

    def __str__(self):
        output = self._dir + "\n"
        output += "Number of Commits: " + str(len(self._commits)) + "\n"

        for commit in self._commits:
            output += commit.toStr("\t")

        return output
    
    def __repr__(self):
        return self.__str__()

class Author:
    def __init__(self):
        self._name = ""
        self._libs = Histogram()

    def setName(self, name):
        self._name = name

    def getName(self):
        return self._name

    def getLibs(self):
        return self._libs

    def toStr(self, tab):
        output = tab + "Author: " + self._name + "\n"
        output += "\n"
        output += self._libs.toStr(tab + "\t")

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

class Commit:
    def __init__(self):
        self._author = ""
        self._commit = ""
        self._date = ""
        self._message = ""
        self._file_names = []
        self._files = []

    def setAuthor(self, name):
        self._author = name

    def getAuthor(self):
        return self._author

    def setCommitID(self, commit):
        self._commit = commit

    def getCommitID(self):
        return self._commit

    def setDate(self, date):
        self._date = date

    def getDate(self):
        return self._date

    def setMessage(self, message):
        self._message = message

    def getMessage(self):
        return self._message

    def addTFile(self, f):
        self._file_names.append(f)

    def getTFiles(self):
        return self._file_names

    def addFile(self, f):
        self._files.append(f)

    def getFiles(self):
        return self._files

    def toStr(self, tab):
        output = tab + "####################### COMMIT #######################\n"
        output += tab + "Author: " + self._author + "\n"
        output += tab + "Commit ID: " + self._commit + "\n"
        output += tab + "Date: " + self._date + "\n"

        output += tab + "Number of Files: " + str(len(self._files)) + "\n"
        for f in self._file_names:
            output += tab + "\t" + f + "\n"

        output += tab + "Message: \n" + tab + "\t" + \
            self._message.replace("\n", "\n" + tab + "\t") + "\n"

        output += tab + "Stats: \n"
        for f in self._files:
            output += f.toStr(tab + "\t") + "\n" 
        output += tab + "######################################################\n"

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

class File:
    def __init__(self):
        self._local = ""
        self._remote = ""
        self._declarations = Histogram("Declarations")
        self._invocations = Histogram("Invocations")

    def setLocal(self, name):
        self._local = name

    def getLocal(self):
        return self._local

    def setRemote(self, name):
        self._remote = name

    def getRemote(self):
        return self._remote

    def getDeclarations(self):
        return self._declarations

    def getInvocations(self):
        return self._invocations

    def toStr(self, tab):
        output = tab + "Local File: " + self._local + "\n"
        output += tab + "Remote File: " + self._remote + "\n"

        output += self._declarations.toStr(tab + "\t")
        output += self._invocations.toStr(tab + "\t")

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

class Histogram:
    def __init__(self, name):
        self._name = name
        self._hist_add = {}
        self._hist_delete = {}

    def add(self, name, edit, value):
        print(name)
        print(edit)
        if edit == "INSERT":
            if name in self._hist_add:
                self._hist_add[name] += value
            else:
                self._hist_add[name] = value
        elif edit == "DELETE":
            if name in self._hist_delete:
                self._hist_delete[name] += value
            else:
                self._hist_delete[name] = value

    def getAdditionHist(self):
        return self._hist_add

    def getDeletionHist(self):
        return self._hist_delete

    def toStr(self, tab):
        output = tab + self._name + "\n"
        output += tab + "\tAdditions\n"

        for key, value in self._hist_add.items():
            output += tab + "\t\t" + key + ": " + str(value) + "\n"

        output += tab + "\tDeletions\n"

        for key, value in self._hist_delete.items():
            output += tab + "\t\t" + key + ": " + str(value) + "\n"

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

def getStats(filename):
    current_project = None
    current_commit = None
    current_file = None
    message_start = False
    message = ""
    file_touched_start = False
    with open(filename) as f:
        for line in f:
            if ("#PROJECT_START" in line):
                current_project = Project()
            if ("#PROJECT_END" in line):
                #print(current_project)
                projects.append(current_project)
            if ("#PROJECT_NAME" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_project.setDir(name)
            if ("#COMMIT_START" in line):
                current_commit = Commit()
            if ("#COMMIT_END" in line):
                #print(current_commit)
                current_project.addCommit(current_commit)
            if ("#AUTHOR" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_commit.setAuthor(name)
            if ("#COMMIT_ID |" in line):
                commits = line.split("|")[1].replace('\n','').strip().split()
                current_commit.setCommitID(commits[0])
            if ("#DATE |" in line):
                date = line.split("|")[1].replace('\n','').strip()
                current_commit.setDate(date)
            if ("#COMMIT_MESSAGE_END" in line):
                current_commit.setMessage(message)
                message_start = False
                message = ""
            if (message_start):
                message += line
            if ("#COMMIT_MESSAGE_START" in line):
                message_start = True
            if ("#FILES_TOUCHED_END" in line):
                file_touched_start = False
            if (file_touched_start):
                current_commit.addTFile(line.replace('\n','').strip())
            if ("#FILES_TOUCHED_START" in line):
                file_touched_start = True
            if ("#FILE1" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_file.setLocal(name)
            if ("#FILE2" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_file.setRemote(name)
            if ("#STATS_START" in line):
                current_file = File()
            if ("#STATS_END" in line):
                #print(current_file)
                current_commit.addFile(current_file)
            if ("#DECLARE" in line):
                split_str = line.split("|")
                edit = split_str[1].strip()
                name = split_str[2].strip()
                value = int(split_str[3].strip())
                current_file.getDeclarations().add(name, edit, value)
#            if ("#GENERIC_DECLARE" in line):
#                split_str = line.split("|")
#                edit = split_str[1].strip()
#                name = split_str[2].strip()
#                value = int(split_str[3].strip())
#                current_file.getGenericDeclarations().add(name, edit, value)
#            if ("#USED_IN_GENERIC_DECLARE" in line):
#                split_str = line.split("|")
#                edit = split_str[1].strip()
#                name = split_str[2].strip()
#                value = int(split_str[3].strip())
#                current_file.getUsedInGenericDeclarations().add(name, edit, value)
            if ("#INVOCATIONS" in line):
                split_str = line.split("|")
                edit = split_str[1].strip()
                name = split_str[2].strip()
                value = int(split_str[3].strip())
                current_file.getInvocations().add(name, edit, value)


def mergeProjectCSV(csv):
    title = csv.split('\n', 1)[0]
    csv = csv.replace(title, "")
    csv = title + csv
    return os.linesep.join([s for s in csv.splitlines() if s])


files = ["out1.out", 
        "out2.out",
        "out3.out",
        "out4.out",
        "out5.out",
        "out6.out",
        "out7.out"]

files = ["test.out"]

print("Gathering Dump Data ...")
for f in files:
    getStats(f)
print("Number of Projects: " + str(len(projects)))
print("Gathering Stats ...")

dump_file = open('dump.out', 'w')

for project in projects:
    #print(project.getStats()[2])
    stats = project.getJSON()
    
    dump_file.write(stats)