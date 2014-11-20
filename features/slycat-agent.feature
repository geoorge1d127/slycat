Feature: Slycat Agent

  # General command behavior

  Scenario: Unparsable command
    When an unparsable command is received
    Then the agent should return an invalid command error

  Scenario: Invalid command
    When a parsable but invalid command is received
    Then the agent should return an invalid command error

  Scenario: Missing action command
    When a command without an action is received
    Then the agent should return a missing action error

  Scenario: Unknown command
    When an unknown command is received
    Then the agent should return an unknown command error

  # Browse command

  Scenario: Browse without path
    When a browse command without a path is received
    Then the agent should return a missing path error

  Scenario: Browse relative path
    When browsing a relative path
    Then the agent should return a relative path error

  Scenario: Browse nonexistent path
    When browsing a nonexistent path
    Then the agent should return a path not found error

  Scenario: Browse directory
    When browsing a directory
    Then the agent should return the directory information

  Scenario: Browse directory with file reject rule
    When browsing a directory with a file reject rule
    Then the agent should return the directory information without the rejected files

  Scenario: Browse directory with file allow rule
    When browsing a directory with file reject and allow rules
    Then the agent should return the directory information without the rejected files, with the allowed files

  Scenario: Browse directory with directory reject rule
    When browsing a directory with a directory reject rule
    Then the agent should return the directory information without the rejected directories

  Scenario: Browse directory with directory allow rule
    When browsing a directory with directory reject and allow rules
    Then the agent should return the directory information without the rejected directories, with the allowed directories

  Scenario: Browse file
    Given a sample csv file
    When browsing the csv file
    Then the agent should return the file information

  # File retrieval

  Scenario: Get file without path
    When retrieving a file without a path
    Then the agent should return a missing path error

  Scenario: Get file with a relative path
    Given a relative path
    When retrieving a file
    Then the agent should return a relative path error

  Scenario: Get file with a directory path
    Given a directory path
    When retrieving a file
    Then the agent should return a directory unreadable error

  Scenario: Get nonexistent file
    Given a nonexistent file
    When retrieving a file
    Then the agent should return a path not found error

  Scenario: Get file without permissions
    Given a sample csv file
    And the file has no permissions
    When retrieving a file
    Then the agent should return an access denied error

  Scenario: Get csv file
    Given a sample csv file
    When retrieving a file
    Then the agent should return the csv file

  # Image retrieval

  Scenario: Get image without path
    When retrieving an image without a path
    Then the agent should return a missing path error

  Scenario: Get image with a relative path
    Given a relative path
    When retrieving an image
    Then the agent should return a relative path error

  Scenario: Get image with a directory path
    Given a directory path
    When retrieving an image
    Then the agent should return a directory unreadable error

  Scenario: Get nonexistent image
    Given a nonexistent image
    When retrieving an image
    Then the agent should return a path not found error

  Scenario: Get image without permissions
    Given a sample jpeg image
    And the file has no permissions
    When retrieving an image
    Then the agent should return an access denied error

  Scenario: Get jpeg image
    Given a sample jpeg image
    When retrieving an image
    Then the agent should return the jpeg image

  Scenario: Get jpeg image with maximum width
    Given a sample jpeg image
    When retrieving an image with maximum width
    Then the agent should return a jpeg image with maximum width

  Scenario: Get jpeg image with maximum size along both dimensions
    Given a sample jpeg image
    When retrieving an image with maximum size
    Then the agent should return a jpeg image with maximum size

  Scenario: Get jpeg image converted to png image
    Given a sample jpeg image
    When retrieving an image converted to a png image
    Then the agent should return the converted png image

  Scenario: Get image with unsupported content type
    Given a sample jpeg image
    When retrieving an image with an unsupported content type
    Then the agent should return an unsupported content type error

  # Video creation

  Scenario Outline: create video from sequence
    Given a sequence of <source type> images
    When creating a <target type> video
    Then the agent should return a video session id
    And the agent should return a <target type> video

    Examples:
      | source type | target type |
      | jpeg        | mp4         |
      | jpeg        | webm        |
